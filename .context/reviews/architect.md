# Architect Review — Cycle 2 (2026-07-16)

## Inventory and system coverage

Reviewed all 110 current nonhistorical tracked paths at cc6f24f: 50 src, 18 E2E/fixtures, 19 public assets, 7 scripts, workflow/package/configs, README, and active context. Historical material was inventoried only. The review covered the client-only data boundary, generated parser worker, app/session ownership, full versus filtered track models, map adapter, scene model, export adapter, static export hardening, and release gates.

Fresh evidence: lint, typecheck, 266 unit tests, zero high audit findings, production build, generated-worker drift check, and static smoke pass.

## Findings

### ARCH2-01 — Session ownership is centralized for state resets, not asynchronous operations

Severity: Medium | Confidence: High | Status: Confirmed boundary gap

Evidence: page.tsx:366-397 routes final commits through loadTrackIntoSession but handleLoadSample owns an untracked request. FileUpload.tsx:29-95 has its own AbortController, while manual journey starts at page.tsx:407-409. These producers do not share an operation identity.

Failure scenario: an earlier producer commits after a newer session intent and wins solely because it resolves last.

Fix: introduce one page-level session-operation generation/cancellation API. Child operations may have local aborts, but all commits must validate the shared generation.

### ARCH2-02 — Timeline’s public model mixes distance and index units

Severity: Medium | Confidence: High | Status: Confirmed type/model defect

Evidence: TimelineSelector.tsx:10-17 accepts cumulativeDistances and emits startIdx/endIdx, while private state at lines 155-168 is distance ratio. clampTimelineRatios at lines 95-105 accepts pointCount and constrains the distance ratio with an index-derived value.

Failure scenario: uneven spacing violates the implicit conversion and blocks valid trim ranges.

Fix: make coordinate domains explicit in types/names. Prefer an index selection model projected to distance positions, or a distance selection model with adjacency validated only after resolution.

### ARCH2-03 — Trail rendering still republishes mutable prefixes despite the extracted geometry module

Severity: High | Confidence: High | Status: Confirmed scalability boundary defect

Evidence: map-geometry.ts:78-93 builds a new prefix; MapView.tsx:410-423 sends it through setData. .context/project/02-architecture.md:75-77 describes an immutable/O(1) model that the adapter does not implement.

Failure scenario: large inputs couple playback/export frame progression to repeated O(prefix) allocations and MapLibre GeoJSON parsing.

Fix: define an immutable route geometry contract and a small progress-state contract at the map adapter boundary. Benchmark before choosing line-gradient/feature-state, chunks, or append semantics.

### ARCH2-04 — In-process export cannot provide bounded cancellation during finalization

Severity: Medium | Confidence: High | Status: Confirmed architectural limitation

Evidence: useExportController.ts:125-127 exposes signal cancellation, but videoEncoder.ts:65-69 and 232-235 show the library finalization phase is not signal-aware and cannot be cancelled through Output.

Failure scenario: a native encoder flush that never settles also prevents React cleanup, size restoration, and another export.

Fix: add a watchdog and, for a genuine hard stop, place encoding in a worker boundary that can be terminated. Model exporting and finalizing as separate states.

### ARCH2-05 — Static security policy is verified as text, not as an ordered document invariant

Severity: Medium | Confidence: High | Status: Confirmed architecture/test gap

Evidence: harden-static-export.mjs:141-151 validates directives and lines 160-173 replace in place. smoke-static.mjs:135-195 repeats content checks. Neither asserts CSP precedes scripts; a fresh artifact has 5–7 scripts before it.

Failure scenario: policy tests stay green while early executable content remains outside the meta policy.

Fix: elevate CSP placement to a static artifact invariant, or move enforcement to response headers where deployment supports them.

## Boundary assessment

The shared generated parser, parse-wide budget, worker schema/timeout, fullTrack/track split, MapViewHandle, modal shell, local-only styles, and client-only privacy boundary are sound improvements. Map geometry has begun moving out of MapView and the real MP4 path is now meaningful. Dependency freshness is reported by the critic, and CI/legal authorization blocks remain outside source architecture.

## Final sweep

Rechecked imports, state owners, imperative handles, lifecycle cleanup, worker generation, static postprocessing, tests, and documentation claims. No additional layer inversion or server/data persistence leak met the threshold.
