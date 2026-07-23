# Cycle 4 Security Review — 2026-07-23

Reviewed revision: `975dded34c849db4eb972221ed9483d3d64fb81d`
Branch: `review-plan-fix/no-deploy-20260723`
Role: security reviewer
Result: **0 genuinely new actionable findings**

## Scope and method

I inventoried and reviewed the current application source, worker source and
generated worker, scripts and process fixtures, unit/process/E2E tests,
dependency and tool configuration, GitHub Pages workflow, runtime public
assets, and current contributor/project documentation. The review traced these
trust boundaries end to end:

- user-controlled GPX, KML, and Google Timeline JSON into the main-thread and
  worker parsers;
- worker messages back into application state;
- track and scene state into MapLibre geometry, camera state, WebCodecs,
  downloads, and Web Share;
- same-origin static assets, sample loading, CSP hardening, and the preview
  server;
- E2E wrapper launch, ownership discovery, exact signalling, cleanup, and
  provider rollback.

This is a static client application with no app-owned API, database,
authentication system, authorization boundary, or server-side file upload.
Those OWASP categories were assessed as not applicable rather than assumed to
exist.

Per the assignment, I did not use the network and did not launch a browser or
run an E2E command. I used the current-head gate evidence recorded in
`.context/plans/cycle3-implementation-2026-07-23.md:239-280`, including the
zero-vulnerability High-severity audit, hardened build, both E2E matrices, real
MP4 gate, and exact process cleanup. Local inspection confirmed that installed
top-level packages match the declared versions; every resolved lockfile
package uses the npm registry and carries integrity metadata.

## Security assessment

- **Injection and untrusted markup:** imported names are control-stripped and
  code-point bounded in `src/lib/parse-utils.ts:89-105`; application output is
  rendered through React. The only production `dangerouslySetInnerHTML` use is
  the fixed bootstrap source in `src/app/layout.tsx:56-75`. No current
  production `eval`, `Function`, raw `innerHTML`, or user-selected script/style
  URL sink remains.
- **Parser denial of service and XML handling:** format-specific byte limits,
  the shared 250,000-point budget, JSON depth checks, XML tag/depth checks, and
  raw `DOCTYPE`/`ENTITY` rejection are enforced in
  `src/lib/parse-utils.ts:6-64`, `src/lib/googleJsonParser.ts:225-382`, and
  `src/lib/parser.ts:140-181,244-524`. The worker accepts only a bounded JSON
  `ArrayBuffer` in `src/workers/trackParser.worker.ts:14-35`, and the main
  thread validates returned point, date, segment, and fallback-name shapes in
  `src/lib/parser.ts:272-303`.
- **Network and URL boundaries:** the only application fetch is the
  same-origin sample asset in `src/app/page.tsx:418-453`; map styles, worker,
  fonts, and map resources are same-origin. The coordinate jump parser does
  not geocode. External help links are fixed allowlisted application literals
  and use `rel="noopener noreferrer"` in
  `src/components/GoogleGuide.tsx:367-377`.
- **CSP and static serving:** the production postprocessor hashes emitted
  inline scripts and styles, requires exactly one early CSP meta element, and
  fails closed on placeholder output in
  `scripts/harden-static-export.mjs:1-226`. The preview server decodes and
  normalizes request paths, proves canonical in-root containment, opens with
  `O_NOFOLLOW` when available, revalidates device/inode identity, permits only
  GET/HEAD, and emits restrictive response headers in
  `scripts/serve-static.mjs:45-277`. Bundled map styles contain no sources,
  sprites, glyphs, or symbol layers.
- **Secrets and storage:** no credential, private key, access token, or
  hard-coded secret is present in current tracked source/configuration.
  Browser storage contains only enum-validated preferences and localhost/dev
  test markers; imported track data is not persisted or transmitted.
- **Supply chain and workflow:** package-lock entries are registry-resolved and
  integrity-pinned. GitHub actions are commit-pinned, checkout credentials are
  not persisted, job permissions are minimized, and Pages write/id-token
  permission exists only in the dependent deploy job in
  `.github/workflows/deploy-pages.yml:1-53`.
- **Process cleanup:** the current tracker contract includes every method used
  during cleanup and diagnostic formatting cannot replace survivor evidence
  (`scripts/e2e-process-supervisor.mjs:405-445,511-533`). The supervisor avoids
  broad name-based termination. The narrower portable POSIX guarantees remain
  accurately documented rather than overstated.

## Exclusions and final sweep

I excluded the seven fixed Cycle 3 roots in `.context/reviews/_aggregate.md`:
constant-time longitude wrapping, bounded reference-grid allocation, short
More-menu scrolling, export-session Share state, responsive More focus
ownership, the complete tracker contract, and Windows supervisor
documentation. Their fixes are present at this revision.

I also excluded the three explicit native/host-capability boundaries in
`.context/plans/deferred-p01-platform-boundaries-cycle2-2026-07-23.md`. Current
source provides no new containment capability or contradictory evidence that
would satisfy their exit criteria.

A final sweep of user-controlled strings and URLs, DOM sinks, file and worker
boundaries, object-URL ownership, local storage, public SVG/JSON assets,
filesystem traversal/symlink handling, process signalling, workflow
permissions, dependency metadata, and secrets produced no additional
actionable root.

## Findings

None.
