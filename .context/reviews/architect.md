# Architect Review — Cycle 4 (2026-07-16)

## Result

**New architecture findings: 0.** Current boundaries remain coherent for a client-only application. Three already-known correctness carryovers expose ownership gaps; they are summarized here as architectural implications, not counted again as independent findings.

## System coverage

Reviewed the client-only trust boundary, parser/worker parity, session replacement, full-versus-filtered track models, segmented distance and camera math, React state ownership, MapLibre adapter and gesture lifecycles, scene history, export adapter/finalization, static-output hardening, workflow/configuration, and the active deferred register at `4917d39`.

Local lint and all 352 unit tests passed. Typecheck could not be independently evaluated while another review process was mutating Next's generated `.next/dev/types/routes.d.ts`; no source-level architectural conclusion is drawn from that shared artifact.

## Carryover boundary analysis

### ARCH4-CARRY-01 — Gesture settlement is effect-local rather than transaction-owned

Related code carryover: `CR4-CARRY-03`
Evidence: `src/components/JourneyCreator.tsx:360-399`, `src/components/JourneyCreator.tsx:519-531`

The map setup effect owns `activeDragInput`, transient listeners, cursor state, and `dragPan`, while toolbar actions live outside that owner. This prevents Undo and Clear from atomically terminating the same gesture transaction before mutating route state.

Recommended boundary: one idempotent Journey Creator interaction controller (or a settlement ref with a strict lifetime contract) should own acquisition, move, and release. Every terminal path—map/window terminal events, Undo, Clear, Cancel, Done, style reload, and unmount—must invoke that same release operation.

### ARCH4-CARRY-02 — Export state has presentation ownership but no exclusive runtime owner

Related code carryover: `CR4-CARRY-01`
Evidence: `src/lib/useExportController.ts:131-146`, `src/lib/useExportController.ts:279-318`

`isExporting` describes UI state after React commits, whereas `exportAbortRef` is the actual runtime capability. Because acquisition is not atomic, two asynchronous transactions may control one map/canvas and one cleanup path.

Recommended boundary: treat the abort controller (or a monotonically identified export session) as the exclusive lease. Acquire synchronously before any shared mutation, scope progress/finalization to that lease, and release conditionally by identity.

### ARCH4-CARRY-03 — Parser source precedence is structural rather than result-based

Related code carryover: `CR4-CARRY-02`
Evidence: `src/lib/googleJsonParser.ts:97-123`

The parser encodes precedence with nested property-existence branches. That conflates “representation exists” with “representation yielded usable points,” preventing graceful degradation across evolving Google export shapes.

Recommended boundary: give each representation a small decoder returning accepted points/result metadata, then select the first non-empty successful result. Keep this policy in the TypeScript source and enforce generated-worker parity through the existing worker check.

## Existing strategic deferrals

Root-owned playback progress, large-component decomposition, elevation downsampling, parser peak-memory work, and the separate export-capture strategy remain in the active deferred register. Current changes neither resolve nor worsen them, so they are not reopened here.
