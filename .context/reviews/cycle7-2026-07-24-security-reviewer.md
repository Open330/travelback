# Cycle 7 Security Review — 2026-07-24

Reviewed revision: `216001ff2bc4ff8c31da333e50e6d0e982816b5b`
Branch: `review-plan-fix/no-deploy-20260723`
Role: security reviewer
Outcome: **one genuinely new actionable security finding**

## Scope and method

I inventoried all 1,030 tracked paths: all 67 `src/` paths, 12 scripts, 21 E2E
paths, 19 public assets, dependency and lock metadata, root configuration,
the GitHub Pages workflow, and the complete `.context/` plus `plan/` history.
I reviewed every production trust boundary and used ledger-wide searches plus
the relevant aggregates, plans, deferrals, and git history to deduplicate the
result.

The security trace covered:

- user-selected GPX, KML, and Google Timeline JSON through extension and byte
  gates, XML declaration/tag/depth checks, JSON depth checks, coordinate/time
  normalization, point allocation, worker messages, cancellation, and final
  `Track` validation;
- imported names and coordinates through React, SVG, MapLibre, camera state,
  WebCodecs, downloads, Web Share, object URLs, and error presentation;
- DOM/HTML/script/style/URL sinks, external navigation, same-origin runtime
  fetches, local storage, public SVG/map/font/worker assets, CSP generation,
  static preview path resolution, symlink and descriptor validation, and
  response headers;
- credentials and secret-like material, package resolutions and integrity
  metadata, action pinning, workflow permissions, checkout credentials,
  artifact/deployment authority, and E2E process ownership.

Travelback remains a static, local-processing client. It has no app-owned API,
database, authentication or authorization system, server-side upload,
session, tenant, or multi-user data boundary. Those OWASP categories are not
applicable to the current architecture rather than omitted from review.

I excluded every fixed Cycle 1–6 root, including XML declaration handling,
worker validation, coordinate guards, bounded geometry, export lease/object
URL ownership, CSP and filesystem hardening, nested GPX ownership, and all
four Cycle 6 fixes. I also excluded the documented supervisor boundaries:
identity erased before observation, lack of a portable pidfd-grade atomic
identity primitive, and host-environment marker discovery. No new evidence
satisfies their exit criteria.

No browser, Chrome, Playwright, E2E suite, server, build, supervisor fixture,
deployment, network mutation, process signal, or cleanup command was run. The
file-scoped direct/worker parser suites passed all 203 tests. Their fixtures
do not exercise the accepted default-budget boundary below. No browser
process was created by this review.

## Finding

### SEC7-01 — Point-budget-compliant files can exceed the parser's function-argument limit

- Severity: **Medium**
- Confidence: **High**
- Cross-role deduplication: **same causal root as PERF7-01; count once in the aggregate**
- Security property: **client availability / CWE-400 resource handling**
- Regions:
  - `src/lib/parse-utils.ts:7,54-64,109-113`
  - `src/lib/googleJsonParser.ts:63-83,244-275,317-381`
  - `src/lib/parser.ts:39-67,388-415,670-703`
  - `src/workers/trackParser.worker.ts:14-45`
  - `public/workers/trackParser.worker.js:185-193,215-249,252-275`

The parser correctly counts retained points up to its 250,000-point ceiling,
but then expands arrays of that attacker-controlled length as JavaScript call
arguments:

```ts
points.push(...nextPoints)
segments.push(...parseTimelineObjects(root.timelineObjects, budget))
segments.push(...parseSemanticSegments(root.semanticSegments, budget))
```

The same point spread exists in KML/GeoJSON extraction. A budget guard does
not make these calls safe because the accepted ceiling itself exceeds the
current Chromium/V8 function-argument limit.

An exact compliant input is a flat array of 250,000 copies of
`{"latitude":0,"longitude":0}`. Its serialized length is 7,250,001 bytes,
below the 100 MiB JSON gate. All coordinates are valid; the shared budget
reaches but does not exceed 250,000; the untimed observations survive
deduplication; and `assertPointBudget([], 250_000)` passes. The next statement
creates a call with exactly 250,000 arguments and throws `RangeError`.

The generated worker has the same expression. Its catch maps the non-
`ParseError` failure to `INVALID_GOOGLE_JSON`, and the main-thread controller
does not retry explicit worker parse errors. Thus a structurally valid,
advertised-size import is rejected as malformed. A single KML `LineString`
with 250,000 minimal coordinate tokens reaches the same call below the 4 MiB,
tag, and depth limits. Many valid singleton `timelineObjects` or
`semanticSegments` can first fail at the segment-array spreads.

The attack requires the user to select a crafted local route file and affects
that browser session. It does not expose route data, cross an origin or
authorization boundary, execute code, persist server state, or affect other
users. Those constraints make the security severity Medium rather than High.
It remains security-actionable because the advertised resource controls
explicitly admit the input but fail to bound the VM resource used to collect
it.

**Root fix:** replace all user-sized array spreads with ordinary bounded
iteration, preserve the pre-allocation point budget, and regenerate the
worker. Prefer filtering/deduplicating directly into the destination so the
parser does not retain a full `nextPoints` copy just before append. Add direct
and worker regressions at the exact 250,000-point boundary, plus a large
singleton-segment and single-LineString case. Assert successful counts and
segment boundaries, then assert `TOO_MANY_POINTS` for the first point above
the limit.

## Other security assessment

- **Injection and active content:** imported names are control-normalized and
  Unicode-code-point bounded, and React renders imported/user text as text.
  The only production `dangerouslySetInnerHTML` sink contains a fixed
  application bootstrap. No user-controlled `innerHTML`, `eval`, `Function`,
  dynamic script URL, message-execution sink, SVG event handler, or remote
  active-content asset was found.
- **Network, navigation, and storage:** route processing is local. Sample,
  map-style, font, and worker fetches are same-origin. External help URLs are
  fixed Google literals with `noopener noreferrer`. Stored values are
  enum-validated preferences and localhost-only test flags; imported routes
  are not persisted or transmitted.
- **Export and sharing:** duration, FPS, bitrate, resolution, and estimated
  memory are bounded. Export uses abort/generation/lease ownership through
  rendering, encoding, download publication, retry, and URL revocation.
  Filenames are normalized and sanitized; Web Share receives only the
  locally generated file after capability checks.
- **Static delivery:** CSP hardening hashes literal emitted script/style
  bodies, moves one policy before active head content, and fails closed on
  malformed output. The preview server normalizes and contains paths, checks
  canonical targets, uses `O_NOFOLLOW` when available, revalidates open
  descriptor identity, defaults to loopback, and permits only GET/HEAD.
- **Supply chain, CI, and secrets:** active source/configuration contains no
  hard-coded credential, private key, access token, or authorization secret.
  Every lockfile resolution is registry-hosted with integrity metadata.
  Workflow actions are commit-SHA pinned, checkout credentials are not
  persisted, global permissions are empty, build authority is read-only, and
  Pages/id-token writes are isolated to the dependent deployment job after
  lint, type, test, audit, build, and static-E2E gates.

## Historical deduplication and final sweep

F18 in `.context/reviews/_aggregate-cycle2-2026-04-26.md:233-241` concerned
over-budget GPX/KML materialization. Its plan at
`.context/plans/cycle2-implementation-2026-04-26.md:126-133` deliberately
inserted a guard before the existing batch push. SEC7-01 instead occurs when
that guard passes at the supported boundary. Cycle 5's nested-`trkseg`
multiplier (`.context/reviews/cycle5-2026-07-23-security-reviewer.md:28-92`)
was a semantic ownership/allocation bug before rejection; it is repaired and
not reopened here.

The historical elevation `Math.min(...valid)` crash used the same language
primitive in a different consumer and was fixed separately
(`.context/plans/archive/p0-critical-crash-and-correctness-2026-04-18.md:27-52`).
No prior security/performance aggregate or active deferral records the
current direct parser, generated-worker, segment-assembly, and KML boundary
failure.

The final pass over parser resource accounting, worker transport, DOM and URL
sinks, storage, object URLs, downloads/share, public assets, CSP, static
filesystem containment, workflow permissions, dependencies, secrets, and
process ownership produced no second genuinely new security root.
