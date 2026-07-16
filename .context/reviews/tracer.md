# Tracer — Causal Flow Review (Cycle 2, 2026-07-16)

## Inventory and coverage

Traced producer → ownership boundary → consumer across all 110 current nonhistorical tracked paths at cc6f24f, with focus on the 53 paths changed in df8f08a..cc6f24f. Covered import/sample/journey session replacement, full-track distance and point-index domains, scene inverse operations, MapLibre trail publication, export rendering/finalization, and static CSP emission. Local lint, typecheck, 266 unit tests, audit, build, worker check, and static smoke passed.

## Traces

### TR2-01 — Sample request → newer journey → stale session commit

Severity: Medium | Confidence: High | Status: Confirmed

Flow:

1. page.tsx:374-387 starts fetch, text conversion, and parseTrackFile without a generation or signal.
2. FileUpload.tsx:215-240 does not mark that parent operation loading.
3. FileUpload.tsx:288-299 permits Draw Route; page.tsx:407-409 enters the newer journey.
4. The old continuation reaches page.tsx:388 and calls loadTrackIntoSession.

Failure: the old sample becomes the winning session.

Fix boundary: a page-owned operation generation shared by sample, upload, and manual journey transitions.

### TR2-02 — Point-count invariant → distance ratio → point indexes

Severity: Medium | Confidence: High | Status: Confirmed domain crossing

Flow:

1. TimelineSelector.tsx:27-31 defines UI ratios in cumulative-distance space.
2. TimelineSelector.tsx:95-105 converts pointCount into a minimum ratio as if point spacing were uniform.
3. TimelineSelector.tsx:261-275 maps the clamped ratios back through cumulative distances.
4. The index postcondition only prevents a one-point range; it cannot recover a valid pair excluded by the oversized ratio gap.

Failure: [0,1,1000] cannot select points 0..1 because 0.001 is clamped to 0.5.

Fix boundary: enforce adjacency in index space, then project exact index distances back to handles.

### TR2-03 — Cancel click → AbortSignal → unobservable finalize

Severity: Medium | Confidence: High | Status: Confirmed missing propagation

Flow:

1. ExportPanel.tsx:322-330 invokes cancelExport.
2. useExportController.ts:125-127 aborts the controller.
3. videoEncoder.ts:232 is already awaiting output.finalize, which receives no signal.
4. videoEncoder.ts:65-69 refuses cancel after finalizing begins.
5. useExportController.ts:268-309 cleanup cannot run until the promise settles.

Failure: a stalled finalizer keeps UI and map cleanup pending indefinitely.

Fix boundary: a deadline/termination boundary around the encoder, not another signal check in the frame loop.

### TR2-04 — Delete inverse → current scenes → global normalization

Severity: Medium | Confidence: High | Status: Confirmed lost update

Flow:

1. SceneEditor.tsx:376-380 stores deleted scene/index.
2. A later range edit commits into current scenes.
3. Undo at lines 382-388 reinserts only the deleted object, which is locally correct.
4. commitScenes invokes normalizeScenes; camera.ts:25-49 shifts later starts after the restored scene.

Failure: the inverse operation indirectly rewrites a newer overlapping range edit.

Fix boundary: conflict-aware inverse application before global normalization, or invalidation of the undo token when its range is no longer free.

### TR2-05 — Route progress → completed prefix → GeoJSON parse

Severity: High | Confidence: High | Status: Confirmed amplification

Flow:

1. progress interpolation advances segmentIndex.
2. MapView.tsx:416-423 rebuilds completed geometry on each new vertex.
3. map-geometry.ts:84-90 slices the complete active prefix.
4. GeoJSONSource.setData reparses/serializes the growing result.

Failure: total work grows with the sum of all published prefixes rather than only new coordinates.

Fix boundary: publish progress against immutable geometry or bounded chunks.

### TR2-06 — Layout order → in-place hardening → partial CSP window

Severity: Medium | Confidence: High | Status: Confirmed emitted order

Flow:

1. layout.tsx:60-70 declares beforeInteractive script before the CSP meta.
2. Next emits multiple script tags before the placeholder.
3. harden-static-export.mjs:125-173 changes CSP content in place.
4. Fresh out/index.html contains seven scripts before CSP; smoke-static.mjs:135-195 checks directives but not order.

Failure: policy-controlled content before the meta is outside enforcement.

Fix boundary: emitted-document ordering assertion and relocation/header delivery.

## Summary and final sweep

Six causal defects are retained: one High amplification path and five Medium state/domain/security paths. Rechecked aborts, generations, coordinate transforms, inverse operations, source publication, and postbuild transformations; no additional cross-boundary defect met the evidence threshold.
