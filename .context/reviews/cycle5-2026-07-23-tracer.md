# Cycle 5 causal trace — 2026-07-23

**Role:** tracer

**Reviewed revision:** `97f66a63b3df97bce3f349a05248ebb8fef7886e` on `review-plan-fix/no-deploy-20260723`

**Outcome:** two actionable causal roots, matching the verifier findings

## Coverage

I read the governing repository/project documents, current Cycle 4 plan and
aggregate, archived Cycle 1–3 plans/aggregates, explicit platform deferral,
and relevant signed history before tracing current code. The runtime trace
covered import parsing and worker dispatch, track-session ownership,
playback/reset callbacks, scene/trim invalidation, map hydration and wrapped
geometry, export frame/finalization/download ownership, modal/error recovery,
and their focused unit/E2E contracts. Scripts, workflow/configuration, public
worker/style assets, and supervisor source were inventoried for adjacent
effects.

No browser, server, Playwright, process-supervisor execution, deployment, or
source/configuration change was performed. The supervisor evidence threshold
was not met, so no process finding is reported.

## Trace T5-01 — The error boundary cuts below, rather than through, export ownership

- **Severity:** Medium
- **Confidence:** High
- **Evidence:** `src/app/page.tsx:183-243,598-612`;
  `src/components/ErrorBoundary.tsx:22-39,98-108`;
  `src/lib/useExportController.ts:93-102,127-145,267-317,349-366`;
  `src/components/MapView.tsx:930-949`

The relevant ownership graph is:

```text
HomeInner
├── useExportController                    survives descendant error
└── ErrorBoundary
    └── main / MapView / ExportPanel       replaced by fallback on error
```

The resulting failure sequence is:

1. `exportTrack()` acquires an `ExportLease` and captures Track A.
2. A child render/lifecycle error makes `ErrorBoundaryInner` replace
   `main`; `MapView` is removed, but `HomeInner` is not.
3. Because the hook owner did not unmount, the cleanup at
   `useExportController.ts:93-102` does not abort the lease.
4. The boundary exposes Try Again. It has no capture-time `onError`
   transaction; `handleReset()` merely invokes the page callback and
   immediately clears boundary state.
5. `handleErrorReset()` clears canonical session state and calls
   `resetExportSession()`. That function resets visible export result state
   but neither aborts/awaits the lease nor invalidates its write generation.
6. The old owner remains authorized by object identity and later runs its
   success/catch/finally writes into the recovered session.

A held-encoder component probe made step 6 deterministic. The reset changed
`exporting` to `idle` while `isExporting` remained true. Resolving the old
result then changed the reset state to `done`, stored `Track A.mp4`, emitted
the success toast, and wrote playback progress `1`.

The strongest competing hypothesis was that error fallback unmounts the
export controller and therefore triggers its abort effect. Component
placement disproves it: the hook executes in `HomeInner`; the boundary only
wraps the JSX returned afterward. A second hypothesis was that MapView
removal forces every old export to fail before publication. That is not true
once the encoder is in finalization or download, and earlier failure still
has unguarded late state/toast/progress writes.

**Required ownership change:** treat error capture/reset as a track-session
handoff. Cancel immediately when the boundary captures an error, await lease
settlement before Try Again remounts/clears state, and gate all publications
by a session/export generation as well as lease identity.

This is a Cycle 4 survivor, not a duplicate of C4-ARCH-01. The implemented
handoff is local to `loadTrackIntoSession()`; the error-recovery edge never
enters that function. It is also not the historical “controller unmounted
then resetSize touched a destroyed map” issue—the controller remains mounted
in this trace.

## Trace T5-02 — Security-token rejection runs before the XML lexical state machine

- **Severity:** Low
- **Confidence:** High
- **Evidence:** `src/lib/parser.ts:132-138,215-276`;
  `src/lib/parser.test.ts:1392-1414,1432-1491`

The parsing sequence is:

```text
parseGPX / parseKML
  → parseXml(raw text)
    → preflightXml(raw text)
      → whole-document /<!DOCTYPE|<!ENTITY/i rejection
      → only then scan comment / CDATA / PI / declaration / element contexts
    → stripXmlEntities(raw regular expressions)
    → DOMParser
```

Cycle 4 fixed lexical tag/depth accounting inside the scanner. The dangerous
token check is ordered before that scanner, so it cannot inherit the same
context classification. Legal comment and CDATA payloads containing the
literal strings `<!DOCTYPE` or `<!ENTITY` are rejected as if they were active
declarations.

The actual current parsers rejected all four cross-product cases:

| Format | Context | XML well formed | Travelback result |
|---|---|---:|---|
| GPX | comment containing `<!DOCTYPE` | Yes | `XML_PARSE_ERROR` |
| GPX | CDATA containing `<!ENTITY` | Yes | `XML_PARSE_ERROR` |
| KML | comment containing `<!DOCTYPE` | Yes | `XML_PARSE_ERROR` |
| KML | CDATA containing `<!ENTITY` | Yes | `XML_PARSE_ERROR` |

The “input is malformed” alternative was checked separately: `DOMParser`
reported no `parsererror` for any fixture. The “existing lexical tests cover
this” alternative is also false; those tests place repeated ordinary
`<extension>` strings in inert contexts and never trigger the leading
security-token regex.

After moving declaration rejection into the state machine,
`stripXmlEntities()` remains a second context-blind consumer. Leaving it
unchanged would mutate inert user text instead of rejecting it. One lexical
classifier must therefore own both active-declaration rejection and any
defense-in-depth sanitization.

## Passing causal paths and dismissed hypotheses

- Import/session replacement now follows
  `FileUpload → onTrackLoaded → loadTrackIntoSession →
  cancelExportAndWait → lease cleanup → session commit`; no stale Track A
  publication survived that route.
- Renderer geometry uses bounded, renderer-facing segments for route,
  bounds, trail chunks, and active endpoints. Exhaustive sequence and normal
  tile sweeps found no loss/order survivor.
- Journey cancel camera state is queued before temporary track removal,
  consumed once on old-track rehydration, and cleared on confirmed
  replacement. No second camera-state leak survived.
- Trim/scene/theme controls are modal-inert during ordinary export. I did not
  elevate programmatic-only reset combinations without a reachable path.
- Cleanup-error, listener, marker, profile, host-scan, and PID hypotheses were
  not reported without the supervisor-specific proof package required by the
  task.

## Historical deduplication

I compared both roots against all current-loop Cycle 1–4 findings and fixes,
older relevant ErrorBoundary/export and XML/entity reviews, and active
deferrals. T5-01 is the previously unhandled boundary-recovery caller of the
new lease transaction. T5-02 is the prohibited-token branch that executes
outside the newly lexicalized complexity scanner. No other hypothesis
remained both current, reachable, actionable, and non-duplicate.
