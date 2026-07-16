# Cycle 3 — Architect

Reviewed current HEAD `3b6750f` on 2026-07-16 across page/session ownership, component boundaries, MapLibre imperative ownership, gesture transactions, parser/worker duplication, camera/segment semantics, playback/export orchestration, capability discovery, static delivery, tests, and architecture documentation.

## Architectural findings

### C3-AR-01 — Gesture lifecycle is implemented as three incompatible ownership protocols

- Severity: **Medium**
- Confidence: **High**
- Evidence: `src/components/SceneEditor.tsx:187-228`, `src/components/TimelineSelector.tsx:368-435`, `src/components/JourneyCreator.tsx:358-460`
- `SceneEditor` has an explicit pointer transaction with capture, cancel, lost-capture, and blur settlement. `TimelineSelector` uses permanently installed mouse/touch window listeners without cancellation. `JourneyCreator` delegates transient ownership to MapLibre public events and assumes map-level mouseup is document-wide.
- Concrete consequence: the latter two protocols produce C3-CR-01 and C3-CR-02. Each feature also decides independently whether cancellation commits or restores state and which side effects (rAF, cursor, `dragPan`, listener removal) belong to settlement.
- Required direction: define one small pointer-transaction contract (start snapshot, active pointer identity, move, commit, cancel/restore, idempotent cleanup) and apply it consistently. Map-coordinate conversion may remain JourneyCreator-specific, but document/window capture and lifecycle settlement should not be implicit MapLibre behavior.

### C3-AR-02 — Export capability discovery and execution do not share a configuration contract

- Severity: **Medium**
- Confidence: **High**
- Evidence: `src/components/ExportPanel.tsx:96-114`, `src/components/ExportPanel.tsx:144-173`, `src/lib/videoEncoder.ts:146-177`, `src/lib/videoEncoder.ts:205-217`, `src/lib/videoEncoder.ts:363-368`
- The UI asks a codec-only question while the encoder consumes a full `ExportRequest` containing dimensions, bitrate, and frame rate. Because the probe's input type cannot express the execution contract, support status can be true for a configuration the job cannot start (C3-CR-03).
- Required direction: introduce an `ExportCapabilityRequest` derived from the same validated export configuration used to construct the encoder. Return a typed status (`checking`, `supported`, `unsupported`, optionally reason), cache by its stable key, and keep UI gating and runtime validation on that shared boundary.

## Assessment

The overall client-only layering remains coherent: page owns the session, MapView owns track rendering, parser work is bounded/off-main-thread where appropriate, export has explicit abort/finalization boundaries, and static hardening is separated into build-time verification. No additional independent architectural finding met the reporting threshold. The two entries above intentionally synthesize confirmed defects from other roles rather than inflate the deduplicated count.
