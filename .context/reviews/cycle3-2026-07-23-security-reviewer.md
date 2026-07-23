# Security Reviewer — Repository-Wide Review (Cycle 3, 2026-07-23)

Reviewed revision: `7f013a207e64ca54c0864edc5aaf061ebfb36bdf`
Branch: `review-plan-fix/no-deploy-20260723`

## Result

Two new client-side availability findings survived independent security
analysis. They are the same two implementation roots reported by the
performance reviewer and should be deduplicated across roles:

| ID | Cross-role root | Severity | Confidence | Status |
|---|---|---|---:|---|
| SEC3-01 | PERF3-01 | Medium | High | Confirmed algorithmic-complexity exhaustion |
| SEC3-02 | PERF3-02 | Medium | High | Confirmed allocation exhaustion |

There are no new Critical or High security findings. Severity is capped at
Medium because an attacker must persuade a user to select a local route file
and the direct impact is browser/app availability, not code execution, data
exfiltration, or a persistent service outage. A browser-wide memory-pressure
event remains plausible, so these are not dismissed as ordinary slow input.

No browser, Playwright, E2E, server, build, deployment, package mutation,
process termination, or source change was performed. A pure Node arithmetic
diagnostic counted the derived work without opening a browser or allocating
the malicious output.

## Coverage and trust-boundary inventory

The independent security pass inventoried the complete current repository and
reviewed:

- all application/component/lib/worker source and tests, with full traces from
  file selection through worker/main-thread parsing, Track validation,
  MapLibre/React rendering, camera/playback, export, download/share, and
  user-derived filenames;
- JSON/GPX/KML byte, point, nesting, XML tag/depth, abort, worker-response, and
  generated-worker-parity controls;
- layout bootstrap, React HTML sinks, local storage, object URLs, SVG/font/map
  assets, CSP creation and fail-closed smoke checks;
- static-server decoding, traversal, symlink, descriptor-identity, binding,
  cache, and security-header behavior;
- package manifest/lock/overrides, CI permissions, immutable action pins,
  checkout credential policy, full-graph audit gate, Pages artifact boundary,
  and tracked-secret/executable-sink sweeps;
- both E2E wrappers, process supervisor/fixtures/tests, and the three explicit
  P01 platform-boundary deferrals;
- README and current authoritative `.context` documents, using historical
  reviews only to exclude fixed, duplicated, deferred, or obsolete findings.

Static lock inspection found 582 package entries, lockfile v3, no missing
integrities, and no non-registry resolved package. Public map styles have no
remote sources, glyphs, sprites, or tiles; the SVG active-content sweep found
no script, event handler, `foreignObject`, or JavaScript URL. The current
workflow uses `persist-credentials: false`, job-scoped permissions, immutable
action SHAs, and a blocking full-graph `npm audit --audit-level=high`.

## Shared malicious-file primitive

The following flat Google JSON pattern is accepted without violating any
format or size rule:

```text
record i = {
  latitude: 0,
  longitude: normalizeLng(i * 179)
}, i = 0..199999
```

Every raw coordinate is finite and inside the parser's geographic range
(`src/lib/googleJsonParser.ts:66-83`), untimed records are retained
(`src/lib/googleJsonParser.ts:244-276`), and 200,000 points are below the
250,000-point/100 MiB limits (`src/lib/parse-utils.ts:6-30`;
`src/lib/parser.ts:492-524`). The parser worker therefore returns a valid Track
to the main thread. Route-ordered unwrapping maps point `i` to display
longitude `i * 179`, reaching a 35,799,821-degree span.

## Findings

### SEC3-01 — A valid route file triggers quadratic main-thread longitude adjustment

Severity: **Medium**
Confidence: **High**
Status: **Confirmed algorithmic-complexity exhaustion (CWE-400)**

Exact regions:

- `src/lib/interpolate.ts:11-19`
- `src/lib/map-geometry.ts:103-124,253-269,283-317`
- `src/components/MapView.tsx:1061-1085`
- `src/lib/googleJsonParser.ts:66-83,244-276`
- `src/lib/parse-utils.ts:6-30`

Evidence:

`wrapLngNear()` crosses one 360-degree world per loop iteration. Prepared
longitudes become the next references, so the shared valid file forces exactly
9,944,394,996 loop-body executions during synchronous route preparation.
Worker isolation protects JSON parsing but ends before this work; the expensive
geometry stage runs in the renderer track effect. Existing size/point limits
do not bound the number of world-copy adjustments.

Attack scenario:

An attacker distributes a Google-history-looking file and persuades a user to
import it. The worker reports successful parsing, after which the renderer
becomes unresponsive for a prolonged period. The app has no opportunity to
show a recoverable validation error, and repeated imports/reloads can recreate
the denial of service.

Recommended fix:

Implement `wrapLngNear()` with constant-time arithmetic that preserves its
current exact-`±180` behavior. Add a parser-to-geometry regression using valid
normalized coordinates plus direct far-reference tests. The assertion should
prove bounded operation count rather than depend on machine timing.

### SEC3-02 — A valid multi-wrap route expands into more than 14 million grid features

Severity: **Medium**
Confidence: **High**
Status: **Confirmed allocation exhaustion (CWE-400)**

Exact regions:

- `src/components/MapView.tsx:173-278,1061-1085`
- `src/lib/map-geometry.ts:103-153,253-269`
- `src/lib/map-geometry.test.ts:26-100`
- `src/lib/parser.ts:492-524`

Evidence:

The reference-grid step stops growing at 10 degrees, while both longitude
margins grow by 1.5 times the route span. For the accepted file, the expanded
width is 143,199,284 degrees and the current count formula enters a loop for
exactly 14,319,930 longitude lines. Each iteration creates a feature,
properties object, line geometry, coordinate arrays, and numbers before
MapLibre receives or copies the collection. There is no feature budget or
pre-allocation count rejection.

This is distinct from SEC3-01: once longitude wrapping is made O(1), the same
input immediately reaches this much larger memory allocation.

Attack scenario:

A user imports the crafted file in an otherwise healthy tab. Synchronous
construction of millions of nested objects can exhaust the renderer heap,
terminate the tab, or create browser/system memory pressure. The input stays
inside every advertised parser boundary.

Recommended fix:

Impose a hard per-axis/total grid feature budget and select an adaptive “nice”
step from the expanded span. Reject or clamp any non-finite/out-of-budget count
before allocation. Prefer a bounded viewport/world-copy grid if full route-span
coverage is not visually necessary. Extract the builder and test the maximum
parser-valid multi-wrap span so output count remains constant-bounded.

## Positive controls and final exclusions

- Imported names and parser errors reach React text/attribute sinks rather than
  user-controlled HTML. The sole production `dangerouslySetInnerHTML` payload
  is a repository-authored bootstrap string and is covered by literal CSP
  hashing.
- XML rejects active declarations and enforces byte/tag/depth limits; JSON
  enforces byte/depth/point limits and validates worker messages. No XXE,
  executable deserialization, prototype-pollution sink, or cross-origin upload
  path survived review.
- Runtime assets and map styles are local. CSP, static hardening, preview path
  resolution, descriptor validation, loopback binding, and response headers
  exposed no fresh bypass.
- CI credential persistence and dev-graph audit coverage are fixed; no tracked
  secret, mutable external action, non-registry lock resolution, or new
  dependency finding survived the sweep.
- Process ownership changes were inspected under the Cycle 2 P01 gate. No new
  P01 issue was reported because none satisfied the required pre-fix failing
  regression, exact survivor scan, and independent post-fix audit. The three
  pure-Node/native boundary deferrals remain explicit and were not re-opened.
- Finalization retention is the already documented Mediabunny API limitation,
  not a fresh security finding.

No other new security issue met the actionable evidence threshold.
