# Cycle 5 Security Review — 2026-07-23

Reviewed revision: `97f66a63b3df97bce3f349a05248ebb8fef7886e`
Branch: `review-plan-fix/no-deploy-20260723`
Role: security reviewer
Outcome: **1 genuinely new actionable security finding**

## Scope and method

I reviewed the current application and generated worker, import parsers and
validation limits, React/DOM and URL sinks, local storage and downloads,
MapLibre/WebCodecs boundaries, CSP/static export and preview serving,
dependencies and lock metadata, workflow permissions, secrets, and E2E
process ownership. This application is a static local-processing client with
no app-owned API, authentication system, authorization boundary, database, or
server-side upload, so those categories were assessed as not applicable.

Current dependency checks reported zero npm audit vulnerabilities, a complete
`npm ls --all` tree, and current generated-worker parity. Workflow actions are
commit-pinned, checkout credentials are not persisted, and elevated Pages
permissions remain isolated to deployment.

No browser, server, Playwright, E2E command, deployment, or supervisor fixture
was started. The executable parser evidence was collected in memory with the
actual current parser and jsdom's `DOMParser`.

## Finding

### SEC5-01 — A size/tag/depth-compliant GPX can force multiplicative point allocation before rejection

- Severity: **Medium**
- Confidence: **High**
- Cross-role deduplication: **Same causal root as PERF5-02; count once in the aggregate**
- Security property: **client availability / resource exhaustion**
- Regions:
  - `src/lib/parser.ts:33-34,215-320,597-629`
  - `src/lib/parse-utils.ts:6-25,108-113`
  - `src/lib/parser.test.ts:1416-1429,1461-1491,1556-1586`

The GPX trust boundary applies byte, XML tag, XML depth, and final point-count
limits, but its semantic traversal is multiplicative. `parseGPX()` enumerates
all `trkseg` elements and then calls descendant
`getElementsByTagName('trkpt')` for each segment. A physical point nested
under `d` segments is converted into a new `TrackPoint` object `d` times.

All segment arrays are eagerly built by the outer `.map()` before the later
reduce invokes `assertPointBudget()`. The nominal 250,000-point guard
therefore limits the eventual flattened result, not the attacker-controlled
amount of work and allocation performed before rejection.

The actual parser returned 50, 400, and 1,600 retained points for the same 50
physical `trkpt` nodes at nesting depths 1, 8, and 32. At depth 64 with 5,000
physical points, it processed/materialized 320,000 descendant matches before
throwing `TOO_MANY_POINTS`.

A maximum-impact file does not need to violate any front-door limit:
`gpx > trk` plus 126 nested `trkseg` elements and 100,000 self-closing
`<trkpt lat="0" lon="0"/>` elements is approximately 2.4 MB, has about
100,256 lexical tags, reaches depth 128, and contains only 100,000 physical
points. It nevertheless asks the parser to construct 12.6 million
`TrackPoint` objects and retain the amplified segment arrays before the
reduce can reject. On a memory-constrained browser this can freeze or
terminate the tab; cancellation cannot run while the synchronous XML parser
and extraction are executing.

The attack requires the user to select a hostile local `.gpx` file and affects
that browser session. There is no confidentiality exposure, code execution,
cross-user effect, or persistent server impact, which is why the security
severity is Medium rather than High. The structural bypass of the advertised
resource guards makes it more than a generic “large files are expensive”
observation.

**Root fix:** accept points only from schema-owned/direct `trkseg > trkpt`
relationships and reject nested `trkseg` elements. Apply a shared running
budget before each point-object allocation; do not build all segment arrays
and enforce the budget afterward. Add adversarial nested-segment tests that
assert direct-child ownership, early `TOO_MANY_POINTS`, and a strict bound on
point conversions/descendant queries.

This does not reopen Cycle 4's lexical XML scanner. The scanner correctly
counts the hostile document's real tags and depth; the amplification occurs
after DOM construction during semantic descendant traversal. It is also
distinct from historical F18: that fix moved a budget check before
`points.push(...segment)` but left every amplified segment fully materialized
before the check.

## Other security assessment

- Imported names are control-stripped/code-point bounded and rendered as text.
  The production inline bootstrap is fixed source; no user-controlled
  `dangerouslySetInnerHTML`, `innerHTML`, `eval`, dynamic script URL, or
  equivalent injection sink was found.
- The raw XML declaration matcher is fail-closed. Its separate over-rejection
  of inert comment/CDATA text is a correctness issue reported by other Cycle
  5 roles, not a security bypass, and is not double-counted here.
- Worker messages and returned tracks are shape/range/budget checked. Google
  JSON has byte, depth, allocation, timeout, abort, and generated-worker parity
  controls. The zero-distance per-frame scan recorded as PERF5-01 needs an
  additional playback/export action and is retained as a performance finding
  rather than duplicated as a second security root.
- Application fetches and map assets are same-origin. External help links are
  fixed and use noopener/noreferrer. Download filenames are sanitized, object
  URLs have explicit ownership, and imported tracks are not persisted or
  transmitted.
- Static hardening hashes emitted inline content and fails closed on malformed
  CSP placement. The preview server normalizes paths, proves canonical
  in-root containment, avoids symlink following where supported, revalidates
  opened-file identity, and permits only GET/HEAD.
- No tracked credential, private key, access token, or hard-coded secret was
  found. Package-lock resolutions use registry integrity metadata.

## Exclusions and final sweep

I excluded the current Cycle 4 fixes for bounded multi-wrap geometry,
serialized import replacement, lexical XML scanning, throwing cleanup
accessors, real-Chromium cleanup/finalization, Journey camera restoration, MP4
copy, and mobile forced-click stability.

I also excluded the three documented platform boundaries: marker erasure
before observation, absence of portable pidfd-grade atomic signalling, and
host-environment reads during global marker recovery. No supervisor claim had
the required deterministic pre-fix survivor plus exact listener/marker/
profile evidence and independent post-fix cleanup audit.

The closing sweep of untrusted strings and URLs, XML/JSON limits, worker
messages, DOM sinks, storage, Web Share/download paths, public SVG/JSON
assets, CSP, filesystem traversal and symlinks, workflow permissions, supply
chain metadata, secrets, and process signalling produced no second new
security root.
