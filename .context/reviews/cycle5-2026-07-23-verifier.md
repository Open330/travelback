# Cycle 5 verifier review — 2026-07-23

**Role:** verifier

**Reviewed revision:** `97f66a63b3df97bce3f349a05248ebb8fef7886e` on `review-plan-fix/no-deploy-20260723`

**Outcome:** two confirmed actionable findings

## Scope and method

I verified the expected clean revision before review, read the repository
instructions and current project documentation, and audited the Cycle 1–4
aggregates, implementation plans, explicit deferrals, and relevant git
history before counting findings. I inventoried current production source,
tests, scripts, workflows, configuration, and public runtime assets, then
inspected the causal consumers around parsing, track-session replacement,
export ownership, MapLibre geometry/camera restoration, and recovery.

The three native/host process-supervisor residuals remain governed by
`deferred-p01-platform-boundaries-cycle2-2026-07-23.md`. I did not count a
supervisor issue: this review did not have the mandatory deterministic
pre-fix failure, exact survivor/listener/profile evidence, and independent
post-fix audit needed to reopen one. No browser, app server, Playwright,
process-supervisor test, deployment, commit, push, branch switch, or
production-source edit was performed.

## Cycle 4 verification summary

| Contract | Result | Evidence |
|---|---|---|
| Renderer-facing route/trail geometry stays bounded and ordered across repeated wraps | Pass | Current-source in-memory sweep covered 94,766 canonical/segmented longitude sequences and found zero ordering, bound, or active-endpoint failures. A separate `@maplibre/geojson-vt` sweep tiled 66,420 sequences and lost zero route/trail feature IDs. |
| Track replacement aborts and awaits the active export before committing a new session | Pass for `loadTrackIntoSession` | `page.tsx:340-356` awaits `cancelExportAndWait`; `useExportController.ts:138-145,317-366` retains the lease through cleanup and settlement. Focused controller tests pass. |
| XML complexity accounting ignores inert tag-like text | Pass for the added Cycle 4 cases, fail for prohibited-token text in the same inert contexts | Existing tests at `parser.test.ts:1432-1491` pass for fake ordinary tags, but `parser.ts:215-218` rejects before the lexical scanner can identify comments or CDATA. See V5-02. |
| Cancelled Journey creation restores a provisional manual camera after rehydration | Pass by ownership trace | `page.tsx:358-371` snapshots only manual-camera state; `MapView.tsx:399-415,465-477,770-780` queues, applies, and invalidates the snapshot at the intended boundaries. |
| Every session-clearing route uses the new export handoff | Fail | Error-boundary recovery bypasses the handoff and permits a live export to republish into the reset session. See V5-01. |

## Findings

### V5-01 — Error-boundary recovery resets export UI without cancelling or settling the live export

- **Severity:** Medium
- **Confidence:** High / confirmed by source ownership trace and held-export
  component probe
- **Files:** `src/app/page.tsx:183-243,598-612`;
  `src/components/ErrorBoundary.tsx:22-39,98-108`;
  `src/lib/useExportController.ts:127-145,267-317,349-366`

`HomeInner` owns `useExportController` and then renders `ErrorBoundary`
*below* that hook. When a descendant throws, the boundary replaces its child
subtree, including `MapView`, but `HomeInner` and the export controller remain
mounted. The controller's unmount-abort effect therefore does not run.
`ErrorBoundaryInner` has no capture-time cancellation callback, and its Try
Again handler invokes `onReset` synchronously. The page's
`handleErrorReset()` clears track/playback/export-result state by calling
`resetExportSession()`, but it never calls or awaits `cancelExportAndWait()`.

`resetExportSession()` is only a presentation/result reset. It does not abort
the active lease and does not advance a generation that would invalidate late
writes. A live export can consequently finish after recovery and execute the
ordinary success path: create/store the old blob URL, set the old filename,
publish `done`, show a success toast, and write playback progress `1`.
Earlier-stage exports can instead continue against the removed map until
their frame-render timeout and then publish stale failure recovery.

I exercised the current hook in a no-file, in-memory React/jsdom harness with
the encoder result deliberately held:

1. Start exporting Track A and hold the encoder promise.
2. Call the same `resetExportSession()` used by `handleErrorReset`.
3. Resolve the old Track A encoder result.

Observed state was:

```text
before reset:             isExporting=true,  exportState=exporting
immediately after reset:  isExporting=true,  exportState=idle
after old result settles: isExporting=false, exportState=done
late publications:        Track A.mp4, success toast, progress=1
```

This is not the Cycle 4 pending-import report repeated. Cycle 4 correctly
serialized `loadTrackIntoSession`; this recovery path never calls that
transaction. It is also distinct from the older C15-F05 report, which
concerned `resetSize()` after the controller itself unmounted. Here the
controller stays mounted and accepts stale result writes.

**Root fix:** make boundary capture immediately invalidate/cancel the live
export, and make Try Again await lease settlement before clearing/remounting
the session. The controller should additionally associate publications with
an export/session generation so a reset invalidates every late toast, blob,
filename, progress, and state write. Add a component regression with the
controller owner outside an error boundary, a throwing child inside it, and a
held encoder/finalizer; after Try Again, resolving the old work must publish
nothing and the lease/map cleanup must settle before recovery completes.

### V5-02 — Raw declaration matching rejects valid GPX/KML comments and CDATA before lexical classification

- **Severity:** Low
- **Confidence:** High / reproduced through the actual current parser
- **Files:** `src/lib/parser.ts:132-138,215-245`;
  `src/lib/parser.test.ts:1392-1414,1432-1491`

Cycle 4 introduced a lexical XML scanner that correctly skips comments and
CDATA before counting tags. However, `preflightXml()` first runs this
context-free check over the complete raw document:

```ts
if (/<!DOCTYPE|<!ENTITY/i.test(text)) {
  throw new ParseError(...)
}
```

That check executes before the scanner reaches its comment and CDATA
branches. As a result, inert literal documentation such as
`<!-- mentions <!DOCTYPE gpx> -->` or
`<![CDATA[literal <!ENTITY example> text]]>` rejects the entire otherwise
valid import with `XML_PARSE_ERROR`.

I bundled and called the current `parseGPX`/`parseKML` implementations with a
jsdom `DOMParser`. Four well-formed fixtures—GPX comment, GPX CDATA, KML
comment, and KML CDATA—were independently accepted by `DOMParser` and all
four were rejected by Travelback with
`XML entity declarations are not supported`. The existing Cycle 4 tests use
ordinary `<extension>` text and therefore do not reach this leading check.

Moving only the regex is insufficient because `stripXmlEntities()` is also a
context-free raw replacement and would silently alter the same inert text.

**Root fix:** classify markup lexically first. Reject `DOCTYPE` and `ENTITY`
only when their declaration openers occur outside comments, CDATA, and
processing instructions; then either pass the verified text directly to
`DOMParser` or make defense-in-depth stripping use the same lexical
classification. Preserve the existing real-declaration rejection tests and
add GPX/KML comment and CDATA acceptance cases containing both prohibited
token strings.

## Focused checks

- `npx vitest run src/lib/parser.test.ts src/lib/map-geometry.test.ts src/lib/useExportController.test.ts --reporter=dot`
  — **204/204 tests passed** across 3 files.
- Actual-parser inert-token probe — **4/4 valid documents rejected**, confirming
  V5-02.
- Held-export/reset probe — old Track A result republished `done`, filename,
  success toast, and progress after reset, confirming V5-01.
- Renderer geometry sequence sweep — **94,766 cases, 0 failures**.
- Normal-tile route/trail sweep — **66,420 cases, 0 lost features**.

## Duplicate and final sweep

I suppressed the completed Cycle 1–4 findings, the three explicit P01
platform residuals, and the Cycle 1 evidence/product/legal deferrals. I also
rejected hypotheses that the error boundary unmounts the controller (the hook
is owned above the boundary), that the removed map necessarily prevents all
late success (finalization/download can resolve without another map frame),
and that the XML strings are malformed (all four parse without a
`parsererror`). No additional correctness, cleanup, geometry, camera,
documentation, or supervisor root survived the final causal and historical
deduplication sweep.
