# Cycle 6 Critic Review — 2026-07-24

Reviewed revision: `099e85d8860456dea5e59cfa293a12defb27bd99`
Branch: `review-plan-fix/no-deploy-20260723`
Role: critic
Outcome: **1 genuinely new actionable correctness finding**

## Critical challenge

I challenged the Cycle 1–5 success claims across their negative branches:
empty versus populated semantic structures, accepted versus rejected points,
fallback versus preferred format paths, stale async publication, export
completion versus cleanup settlement, local versus generated-worker behavior,
responsive/focus state, static versus development execution, and claimed
resource bounds versus work performed before rejection.

The final sweep rejected a speculative export-completion candidate: the active
lease intentionally survives map cleanup, reset aborts its wait, and the lease
settles before a subsequent user event can start another export. It did not
support a second actionable root.

## Finding

### CRIT6-01 — An empty or wholly invalid GPX track now suppresses a valid route fallback

- Severity: **Low**
- Confidence: **High**
- Status: **Confirmed by current source, dependency behavior, and the
  pre-Cycle-5 source delta**
- Regions:
  - `src/lib/parser.ts:318-400,670-702`
  - `src/lib/parser.test.ts:995-1026,1051-1063,1334-1362`
- Introduced by: Cycle 5 semantic GPX ownership refactor
- Security impact: **None established; import compatibility/correctness only**

`extractPointsFromGpxSegments()` decides that semantic extraction owns the
document as soon as it finds any root-namespace `trkseg`
(`src/lib/parser.ts:323-325`). It can then discard every child because the
segment is empty or because every direct `trkpt` lacks valid coordinates
(`:340-379`), but still returns the truthy result
`{ points: [], segmentStartIndices: [] }` at `:385`.

`parseGPX()` uses truthiness to select that empty semantic result and never
invokes `@tmcw/togeojson` (`:388-394`). Consequently this valid input loses
both route points:

```xml
<gpx version="1.1">
  <trk><trkseg /></trk>
  <rte>
    <rtept lat="37.4" lon="-122.1" />
    <rtept lat="37.41" lon="-122.09" />
  </rte>
</gpx>
```

Direct `parseGPX()` returns zero points, and the normal file-import boundary
then rejects the file as `TOO_FEW_POINTS`
(`src/lib/parser.ts:696-698`). Replacing the empty segment with only malformed
or out-of-range `trkpt` elements has the same outcome.

The installed togeojson GPX generator skips a track when none of its segments
produce a two-point line, then continues enumerating `rte` elements. Thus the
existing fallback would retain this fixture's route if the empty semantic
result did not block it; the route-only regression at
`src/lib/parser.test.ts:1011-1026` proves the same consumer path.

This is a Cycle 5 regression, not merely another example of historical
`C4-CT04`. Before that refactor, `parseGPX()` filtered empty/all-invalid
segment arrays before deciding whether `segments.length > 0`; when none
remained, it used the togeojson fallback. `C4-CT04` concerns a different,
still-documented product choice: a **valid nonempty** track wins and additional
route/waypoint features are not merged. The narrow fix here restores the prior
zero-accepted-track behavior without changing that mixed-feature policy.

The new tests independently prove route-only fallback
(`src/lib/parser.test.ts:1011-1026`) and empty-segment handling
(`:1059-1063`), but never combine them. The focused current parser suite passes
174/174, showing why the regression remains invisible to existing coverage.

**Root fix:** make the semantic helper return `null` when all root-owned
segments collectively retain zero valid points, so `parseGPX()` invokes the
existing fallback. Preserve nested-segment rejection, direct namespace
ownership, segment boundaries, and early point-budget enforcement. Add
combined regressions for:

1. empty `trkseg` plus a two-point `rte`;
2. all-invalid `trkpt` elements plus a two-point `rte`;
3. a valid semantic track plus a route, asserting the explicitly chosen
   mixed-feature policy so this fix cannot silently broaden it.

## Final adversarial sweep

I revisited parser fallbacks and budgets, generated-worker parity, geometry and
antimeridian behavior, camera/follow ownership, export success/failure/abort
and same-tick re-entry, object-URL lifetime, track/session replacement,
responsive dialogs/focus, localization, static asset/CSP claims, preview path
containment, workflow gates, documentation truthfulness, and process cleanup.

Fixed Cycle 1–5 findings and historical/deferred architecture choices were
deduplicated. Native supervisor residuals were excluded under their explicit
platform-boundary record. No browser, server, E2E, Playwright, Chromium,
supervisor, deployment, process-management, or destructive command was run.
Aside from CRIT6-01, no claim failed with evidence strong enough to constitute
a new actionable causal root.
