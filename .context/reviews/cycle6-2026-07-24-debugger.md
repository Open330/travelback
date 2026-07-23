# Cycle 6 debugger review — 2026-07-24

## Result

One genuinely new causal root survived reproduction, history comparison, and
cross-file tracing. It is the same root as verifier finding V6-01.

### D6-01 — semantic GPX presence is confused with retained semantic GPX data

- **Severity / confidence / status:** Medium / High / Confirmed
- **Fault site:** `src/lib/parser.ts:318-385`
- **User-visible terminus:** `src/lib/parser.ts:388-400,670-702`

#### Causal chain

1. `extractPointsFromGpxSegments` selects owned `trkseg` elements.
2. It returns `null` only when the DOM contains no such element
   (`src/lib/parser.ts:323-326`).
3. Direct `trkpt` children with missing, non-finite, or out-of-range
   coordinates are skipped (`src/lib/parser.ts:347-360`); an empty segment
   similarly contributes nothing.
4. The function nevertheless returns `{ points: [], segmentStartIndices: [] }`
   (`src/lib/parser.ts:385`).
5. Because that object is truthy, `parseGPX` suppresses
   `extractPointsFromGeoJSON(gpx(doc))` (`src/lib/parser.ts:390-393`).
6. A valid sibling `rte` is therefore discarded, and the file-level two-point
   invariant later raises `TOO_FEW_POINTS`.

#### Exact trigger

Either of these track fragments, followed by a route containing two valid
`rtept` children, triggers the fault:

```xml
<trk><trkseg/></trk>
```

```xml
<trk><trkseg><trkpt lat="91" lon="0"/></trkseg></trk>
```

A read-only converter probe on the second complete document returned a
`LineString` with `[[-122.1,37.4],[-122.09,37.41]]`, proving that the suppressed
fallback has sufficient valid data.

#### Why this is a regression rather than schema precedence

- At `d5d7506^`, `parseGPX` mapped segments, removed zero-length retained
  arrays, and chose `@tmcw/togeojson` when none remained. The exact trigger
  therefore fell back successfully.
- Cycle 5 P02 explicitly says to preserve fallback conversion and ordinary
  fallback behavior
  (`.context/plans/cycle5-implementation-2026-07-23.md:107-125`).
- `src/lib/parser.test.ts:1011-1026` was added in the same change to protect a
  route fallback, but its route-only fixture never enters the faulty
  owned-segment branch.
- The older `C4-CT04` mixed-document observation concerns retaining a usable
  track instead of merging a route. D6-01 has no usable track at all and
  restores old behavior without reopening that product-policy question.

#### Repair boundary

Return `null` after extraction when no valid point was retained, then keep the
current semantic result whenever `points.length > 0`. Add two parser tests:

1. empty owned `trkseg` + two valid `rtept`;
2. wholly invalid direct `trkpt` + two valid `rtept`.

Do not broaden the fix into merging routes, waypoints, and usable tracks; that
would change a separate long-standing precedence policy.

## Debug sweeps with no new root

- Rechecked the Cycle 5 changes for zero-distance interpolation, segment
  ownership, manual-camera export restoration, ErrorBoundary/export lease
  settlement, duration drafts, lexical XML declarations, and supervised
  process cleanup.
- Traced stale async publications, lease/generation ownership, URL revocation,
  map resize/camera cleanup, modal and pointer/RAF/listener terminal paths,
  worker fallback/parity, segment plateaus, and trim/scene commit paths.
- Historical candidates such as sample/import invalidation, share-result
  ownership, and uninterruptible third-party MP4 finalization were rejected as
  already-covered roots or documented dependency boundaries.
- No supervisor/browser claim was promoted without the required deterministic
  evidence. No prohibited supervisor, E2E, Playwright, Chromium,
  agent-browser, server, deploy, push, commit, process-kill, or source/plan
  mutation command was attempted.

## Allowed verification

- Focused parser Vitest: 174/174 passing.
- Read-only `@tmcw/togeojson` route probe: two route coordinates retained.
- Pre/post Git diff: behavioral change originates in `d5d7506`.
