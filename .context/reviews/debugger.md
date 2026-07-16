# Debugger — Root-Cause Report (Cycle 2, 2026-07-16)

## Inventory and diagnostic coverage

Inspected all 110 current nonhistorical tracked paths at cc6f24f and the fresh emitted out HTML. Traced the 25 cycle-1 implementation commits plus current tests. Ran lint, typecheck, 266 unit tests, high audit (zero vulnerabilities), build, generated-worker check, and static smoke; all passed. Diagnostics below isolate defects not exercised by those green gates.

## Findings

### DB2-01 — Three-point uneven tracks reproduce the trim over-clamp arithmetically

Severity: Medium | Confidence: High | Status: Deterministically reproduced from exported helpers

Reproduction:

1. Use cumulativeDistances [0,1,1000] for three points.
2. The desired inclusive range 0..1 has ratios [0,0.001].
3. clampTimelineRatios at TimelineSelector.tsx:95-105 returns an end ratio of at least 0.5.
4. ratioToIndex at lines 32-61 resolves distance 500 to end index 2.

Root cause: the minimum index interval was expressed as a uniform ratio interval.

Fix: enforce endIdx >= startIdx + 1 after conversion and return handle positions derived from the accepted indexes. Add this exact fixture to TimelineSelector.test.ts.

### DB2-02 — Fresh build proves CSP ordering is not covered by smoke

Severity: Medium | Confidence: High | Status: Reproduced

Reproduction: run npm run build, then compare the first script and CSP offsets. out/index.html reports firstScript=492, csp=1159, scriptsBefore=7; both error pages report five scripts before CSP. npm run smoke:static still prints OK.

Root cause: layout.tsx:60-70 places bootstrap before CSP, harden-static-export.mjs:125-173 replaces the tag in place, and smoke-static.mjs:135-195 checks content only.

Fix: relocate CSP before active content and make the offset/order assertion part of both postbuild and smoke.

### DB2-03 — Sample CTA bypasses the import cancellation repair

Severity: Medium | Confidence: High | Status: Confirmed control-flow reproduction; browser test absent

Reproduction:

1. Delay sample-trip.gpx or parseTrackFile.
2. Click the sample preview at FileUpload.tsx:215-240.
3. Click Draw Route at lines 288-299.
4. Resolve the delayed operation.
5. page.tsx:388 loads the sample and exits the manual journey.

Root cause: FileUpload’s request lifecycle test covers only its locally created parser controller; handleLoadSample at page.tsx:374-397 has no signal/generation.

Fix: shared page operation generation plus deferred sample regression.

### DB2-04 — Finalization is the only unbounded export await

Severity: Medium | Confidence: High | Status: Confirmed root cause; new hardware stall not reproduced

Reproduction harness: mock Output.finalize with a never-settling promise, start export, then call cancelExport. videoEncoder.ts:232 stays pending because the signal is not observed and lines 65-69 skip Output.cancel. useExportController.ts:268-309 never reaches cleanup.

Root cause: cancellation is cooperative during frame work but finalization is an opaque in-process await.

Fix: watchdog plus terminable worker boundary; add a never-resolving-finalize unit test with fake timers.

### DB2-05 — Scene undo range loss is hidden by the name-only E2E

Severity: Medium | Confidence: High | Status: Deterministically reproduced from normalization

Reproduction:

1. Create A [0,0.15], B [0.15,0.30], C [0.30,0.45].
2. Delete B.
3. Change C start to 0.25.
4. Undo B.

SceneEditor.tsx:382-388 reinserts B, then camera.ts:39-47 normalizes C start to max(0.25,0.30)=0.30. e2e/travelback.spec.ts:1232-1247 checks only a name edit, so it stays green.

Root cause: the inverse object is narrow, but the mandatory global normalizer has broad side effects.

Fix: conflict-aware undo semantics and a range-focused E2E.

### DB2-06 — Keyboard suppression leaks to the next focused control

Severity: Medium | Confidence: High | Status: Confirmed event-path defect

Reproduction: focus a timeline handle, press ArrowRight, Tab to another range/select control, then press an Arrow key within three seconds. TimelineSelector.tsx:141-153 captures the key before the target and blocks it because TimelineSelector.tsx:345-354 armed the guard.

Root cause: a time-based global capture guard is broader than the originating timeline event.

Fix: stop the originating handle event only; remove the three-second global interception.

## Diagnostic conclusion and final sweep

The green gates validate the repaired primary paths but lack adversarial fixtures for uneven distance, CSP placement, parent-owned sample cancellation, never-settling finalize, conflicting scene undo, and cross-control keyboard flow. Rechecked all failed-await cleanup, timer/listener teardown, generated outputs, and current test gaps; no additional reproducible root cause met the threshold.
