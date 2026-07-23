# Cycle 6 Security Review — 2026-07-24

Reviewed revision: `099e85d8860456dea5e59cfa293a12defb27bd99`
Branch: `review-plan-fix/no-deploy-20260723`
Role: security reviewer
Outcome: **0 genuinely new actionable security findings**

## Scope and method

I inventoried and reviewed the current application source, import parsers and
generated worker, public runtime assets, build/static-serving scripts, tests,
dependency metadata, GitHub Pages workflow, and the current Cycle 1–5 review
and implementation record. The closing sweep traced these trust boundaries:

- user-selected GPX, KML, and Google Timeline JSON through byte, structure,
  point, name, worker-message, and cancellation validation;
- imported names and track state through React, MapLibre geometry, camera
  state, WebCodecs, object URLs, downloads, and Web Share;
- local preferences and development-only test markers in browser storage;
- same-origin sample/map/font/worker assets, fixed external help links, CSP
  postprocessing, and static preview path handling;
- dependency resolution, workflow permissions/action pinning, credentials and
  secret-like material, and E2E process-ownership code.

Travelback is a static, local-processing client. It has no app-owned API,
database, authentication or authorization layer, server-side upload, or
multi-user data boundary. Those OWASP categories are not applicable to the
current architecture rather than unreviewed.

No browser, server, Playwright, E2E, Chromium, supervisor fixture, deployment,
network mutation, or process-management command was used. One explicit
file-scoped check, `npx vitest run src/lib/parser.test.ts`, passed all 174
tests. The combined GPX compatibility gap found by the critic role is not in
that suite and is a correctness regression, not a security-boundary bypass.

## Security assessment

- **Untrusted file parsing and availability:** XML imports are limited to
  4 MiB and Google JSON to 100 MiB, with format-specific warnings. XML has
  lexical tag and depth ceilings plus active `DOCTYPE`/`ENTITY` rejection.
  Semantic GPX extraction accepts only direct, document-namespace-owned
  `trkseg > trkpt` points, rejects nested segments, and consumes the shared
  point budget before optional-field traversal and allocation
  (`src/lib/parser.ts:140-294,297-400`;
  `src/lib/parse-utils.ts:6-64`). KML and Google outputs remain subject to
  point, coordinate, structure, and returned-worker-shape validation. The
  historical dense-KML materialization concern remains a recorded performance
  boundary; current evidence does not establish a new limit bypass.
- **Injection and active content:** imported display names are
  control-normalized and bounded by Unicode code point before presentation
  (`src/lib/parse-utils.ts:89-105`). React renders imported content as text.
  The only production `dangerouslySetInnerHTML` use is fixed application
  bootstrap source in `src/app/layout.tsx`; no user-controlled `innerHTML`,
  `eval`, `Function`, dynamic script URL, or equivalent execution sink was
  found. Public SVG and style assets contain no script/event-handler or remote
  active-content path.
- **Network, navigation, and storage:** application data processing is local.
  Runtime fetches for samples, map styles, fonts, and the parser worker are
  same-origin. External guide destinations are fixed literals and use
  `noopener noreferrer`. Storage contains enum-validated locale/theme/map
  preferences and a localhost/development test marker; imported routes are
  neither persisted nor transmitted.
- **Export and sharing:** export requests are bounded by duration, frame rate,
  resolution, bitrate, estimated output, and in-memory limits. The controller
  uses generation/lease ownership and abort checks across map rendering,
  encoding, download publication, cleanup, and object-URL revocation
  (`src/lib/useExportController.ts:125-418`). Filenames are sanitized and
  Web Share receives a locally created file only after capability checks. No
  attacker-selected upload endpoint, scheme navigation, or cross-origin
  credential path was found.
- **Static output and filesystem boundary:** CSP hardening hashes the literal
  emitted inline content, requires exactly one early policy element, and fails
  closed on malformed or placeholder output
  (`scripts/harden-static-export.mjs`). The preview server decodes and
  normalizes URLs, proves canonical in-root containment, uses `O_NOFOLLOW`
  where available, revalidates descriptor identity, permits only GET/HEAD, and
  defaults to loopback (`scripts/serve-static.mjs`).
- **Supply chain, CI, and secrets:** current workflow actions are pinned to
  commit SHAs, checkout credentials are not persisted, global permissions are
  empty, build has read-only contents access, and Pages/id-token writes exist
  only in the dependent deployment job
  (`.github/workflows/deploy-pages.yml:1-62`). The workflow runs the full test
  and high-severity audit gates before upload. Active source/configuration
  contains no credential, private key, access token, or hard-coded secret;
  lockfile resolutions use registry integrity metadata.

## Exclusions and final sweep

I excluded all fixed Cycle 1–5 causal roots, including import replacement and
worker validation, XML lexical handling, GPX descendant amplification,
bounded geometry/wrapping, export lease and camera restoration, save/share
state, and static/process hardening. I also excluded the explicitly documented
native supervisor boundaries: identity erased before observation, lack of a
portable pidfd-grade identity primitive, and host-environment marker recovery.
No new evidence satisfies their exit criteria, and they were not relitigated.

Historical findings about dense KML conversion, in-memory export architecture,
workflow triggers, bidirectional controls in display names, localhost test
stubs, and mixed GPX feature semantics were deduplicated rather than counted
again.

The final pass over DOM and URL sinks, parser resource limits, worker messages,
storage, object URLs, downloads/share, public assets, CSP, static filesystem
containment, dependency/workflow metadata, secrets, and process signalling
produced no new actionable security root.

## Findings

None.
