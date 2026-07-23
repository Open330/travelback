# Cycle 5 debugger review — 2026-07-23

**Role:** debugger

**Reviewed revision:** `97f66a63b3df97bce3f349a05248ebb8fef7886e` on `review-plan-fix/no-deploy-20260723`

**Outcome:** two reproducible failures

## Baseline and constraints

The expected branch/revision was verified before probing. I read current
instructions, project documentation, Cycle 1–4 provenance and fixes, explicit
deferrals, and relevant history, then inspected current source/test consumers
for exception recovery, stale async completion, reset ordering, parser
classification, wrapped geometry, camera restoration, and cleanup evidence.

Focused unit baseline:

```text
npx vitest run \
  src/lib/parser.test.ts \
  src/lib/map-geometry.test.ts \
  src/lib/useExportController.test.ts \
  --reporter=dot

3 files passed; 204 tests passed
```

No browser/server/process-supervisor test was run. No supervisor finding is
eligible without a deterministic failing regression, exact survivor/
listener/profile evidence, and an independent post-fix audit. No source,
configuration, generated artifact, commit, branch, remote, or deployment was
changed.

## D5-01 — A reset can be overwritten by its still-live export owner

- **Severity:** Medium
- **Confidence:** High / deterministic current-hook reproduction
- **Files:** `src/app/page.tsx:183-243,598-612`;
  `src/components/ErrorBoundary.tsx:22-39,98-108`;
  `src/lib/useExportController.ts:127-145,147-179,267-317,349-366`

### Reproduction

I bundled the current `useExportController` into an in-memory React/jsdom
harness. The map boundary returned successful idle results, and only the
encoder/download edges were deterministic mocks. No repository file was
created. The encoder promise was held so reset ordering could be observed:

```text
1. exportTrack(Track A)
2. wait until the encoder owns the request
3. resetExportSession()
4. resolve Track A's held result
```

Observed:

```json
{
  "beforeReset": {
    "isExporting": true,
    "exportState": "exporting"
  },
  "afterReset": {
    "isExporting": true,
    "exportState": "idle"
  },
  "afterOldExportSettles": {
    "isExporting": false,
    "exportState": "done",
    "exportedVideoFilename": "Track A.mp4",
    "toasts": [["app.exportSuccess", "success"]],
    "progressWrites": [1]
  }
}
```

`handleErrorReset()` calls this same reset without first cancelling or
settling the export. The error boundary does not encompass the hook owner, so
a descendant crash unmounts MapView/ExportPanel but not the controller and
does not trigger its unmount abort. It also has no `onError` callback that
could cancel at capture time.

### Why existing tests pass

`useExportController.test.ts:228-334` verifies the correct
`cancelExportAndWait()` protocol and lease retention. It does not exercise a
session reset while a result is held. There is no component regression for
the page's ErrorBoundary/reset composition. The passing lease tests therefore
confirm the primitive but not every caller.

### Fix and regression

Make boundary capture invalidate/cancel the lease immediately. Make Try Again
an async recovery transaction that waits for `cancelExportAndWait()` before
session reset/remount, and make session/export generation part of every late
write authorization.

A regression should hold the encoder/finalizer, throw from a child beneath
the boundary, invoke Try Again, then resolve the old work. Assert:

- the old signal was aborted at capture or before reset;
- recovery does not complete before map/export cleanup settlement;
- no old URL/blob/filename, `done`/idle overwrite, toast, or progress write is
  published;
- a later new-session export can acquire a fresh lease.

This is not a repetition of Cycle 4's import overlap: that caller now awaits
the lease; the error-reset caller does not. It is also not the old destroyed-
map cleanup report, because the controller owner remains mounted here.

## D5-02 — Well-formed inert XML text trips the active-declaration security guard

- **Severity:** Low
- **Confidence:** High / actual-parser reproduction
- **Files:** `src/lib/parser.ts:132-138,215-245`;
  `src/lib/parser.test.ts:1392-1414,1432-1491`

### Reproduction

I bundled the actual current `parseGPX` and `parseKML` functions in memory and
provided jsdom's `DOMParser`. Each fixture contained usable coordinates plus
one inert literal:

```text
GPX comment: <!-- documentation mentions <!DOCTYPE gpx> -->
GPX CDATA:   <![CDATA[literal <!ENTITY example> text]]>
KML comment: <!-- documentation mentions <!DOCTYPE kml> -->
KML CDATA:   <![CDATA[literal <!ENTITY example> text]]>
```

All four raw documents produced `parseerror=false` when checked directly
with `DOMParser`. Travelback rejected all four before parsing:

```text
code=XML_PARSE_ERROR
message=Invalid GPX/KML: XML entity declarations are not supported
```

The failure is deterministic at `preflightXml()`'s first branch:
`/<!DOCTYPE|<!ENTITY/i.test(text)`. The later scanner's comment/CDATA skips
cannot run first. The passing Cycle 4 regression uses only inert ordinary
tags and misses this branch.

### Fix and regression

Move prohibited declaration detection into the same lexical state machine:
after skipping comment/CDATA/PI contexts, reject actual case-insensitive
DOCTYPE/ENTITY declaration openers. Remove raw context-blind entity stripping
after successful preflight, or make it share the same classifier; otherwise
the repair changes rejection into silent inert-text mutation.

Extend the existing GPX/KML parameterized suite with:

- comment and CDATA acceptance for each prohibited token string;
- retained rejection for real external and internal-subset declarations;
- a guard that preserved inert description/comment text is not rewritten
  where that text is observable.

## Negative controls and final sweep

- A 94,766-case current-source wrapped-geometry sweep found zero bound,
  ordering, or endpoint failures.
- A 66,420-case normal-tile sweep lost zero route/trail features.
- The Cycle 4 import handoff, provisional camera restoration, and exact
  export-lease settlement survived direct code/test tracing.
- I rejected the hypotheses that the four XML fixtures were malformed, that
  ErrorBoundary unmounted the hook owner, and that map removal necessarily
  prevents a late finalized result.
- Historical search found the earlier broad XML lexical issue and earlier
  export/error-boundary cleanup discussions, but not these exact surviving
  branches. No third non-duplicate issue survived reproduction and
  competing-hypothesis checks.
