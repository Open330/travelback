# Cycle 7 Architect — 2026-07-17

## Result

COMMENT. The application remains appropriately modular for a client-only static export: parsing is isolated behind a worker-capable boundary, playback/export controllers own lifecycle state, map math is separated from rendering, and delivery hardening is fail-closed. Four boundary contracts are incomplete: ordering under partial timestamps, representation of unknown elevation, ownership of loaded-workspace clearance, and ownership of import-size policy.

The full 884-path inventory, current context, Cycle 6 provenance, production/test/delivery surfaces, and exclusions are recorded in cycle7-code-reviewer-2026-07-17.md and were used for this architectural pass.

## Architecture findings

### ARCH7-01 — The parser has no safe ordering invariant for partially timestamped data

- Severity: Medium
- Confidence: High
- Status: Confirmed; same root cause as CODE7-01 and CRIT7-01
- Location: src/lib/googleJsonParser.ts:228-239, 246-270; src/lib/parser.test.ts:548-560, 980-1013; src/workers/trackParser.worker.ts:1-31

Boundary problem: the Google adapter converts heterogeneous source formats into the canonical Track type, but its normalization contract does not distinguish “fully comparable chronology” from “partially known chronology.” The chosen comparator treats missing time as a sortable value after every known time. Because both the direct parser and generated worker share this function, the architectural parity mechanism faithfully duplicates the defect.

Concrete failure scenario: an otherwise ordered records stream A?, B@10:00, C? crosses the adapter as B, A, C. All downstream consumers—distance accumulation, interpolation, map line generation, timeline trimming, scenes, playback, and export—then operate correctly on a false canonical route. No downstream layer can recover the lost source order.

Suggested fix: make the canonicalization invariant explicit. A segment may be chronology-sorted only when all retained observations have valid timestamps; otherwise preserve producer order and metadata uncertainty. Apply an equivalent all-comparable rule before reordering segments. Encode this as shared parser contract tests that run through both the direct adapter and worker transport.

### ARCH7-02 — Unknown elevation loses its meaning at the presentation boundary

- Severity: Medium
- Confidence: High
- Status: Confirmed; same root cause as CODE7-02 and CRIT7-02
- Location: src/types.ts:1-11; src/components/ElevationProfile.tsx:20-22, 30-60; e2e/travelback.spec.ts:899-907

Boundary problem: TrackPoint correctly models ele as optional and the component initially preserves invalid values as null, but chart geometry has no first-class missing-sample representation. It substitutes min at the last moment, collapsing “unknown” into a valid domain value.

Concrete failure scenario: a route with sparse elevation crosses parsing and the Track model safely, then the final visualization invents repeated descents to the trip minimum. Because the output is valid SVG and finite, syntax-oriented tests and all downstream UI safeguards accept it.

Suggested fix: define one elevation-gap policy at the chart boundary and test it explicitly. A path-run representation that emits separate M/L segments for contiguous valid samples preserves the model's optionality. If interpolation is chosen, restrict it to bounded gaps and document the rule; never coerce unbounded gaps to an extrema value.

### ARCH7-03 — Loaded-workspace clearance is not a shared layout contract

- Severity: Medium
- Confidence: High
- Status: Confirmed; same root cause as CODE7-03 and CRIT7-04
- Location: src/components/KeyboardHelp.tsx:19-30; src/app/page.tsx:618-684; src/components/TrackWorkspace.tsx:142-173; src/app/globals.css:223-227; src/components/TrackToolbar.tsx:162-224

Ownership problem: the composed timeline/elevation/playback stack owns roughly the bottom 19–20 rem, but its clearance is not exported as a token or layout boundary. Map attribution was manually moved to a matching clamp, while KeyboardHelp retains bottom-36. Both Help and the later-rendered stack use z-10.

Concrete failure scenario: at 1440×1000, the stack occupies y=697.47–1000 and Help occupies y=812–856. The full 78.25×44 Help rectangle intersects the stack, and the elevation SVG owns the center hit. The mobile toolbar contains an alternate Help action, but that menu is sm:hidden on desktop.

Suggested fix: make loaded-workspace clearance one owned CSS custom property or structural layout region consumed by every floating control, including Help and map attribution. Alternatively, place Help in the desktop TrackToolbar so it participates in normal composition. Add geometry and hit-owner E2E coverage at supported desktop and mobile breakpoints; a screenshot-only check is not sufficient.

### ARCH7-04 — File-size policy has three sources of truth

- Severity: Low
- Confidence: High
- Status: Confirmed current drift; documentation manifestation is DOC7-02
- Location: src/lib/parse-utils.ts:9-12; src/lib/parser.ts:481-492; src/components/FileUpload.tsx:20, 64-76; src/lib/i18n.ts:214, 578, 942, 1306, 1670

Ownership problem: parse-utils owns enforceable XML/JSON limits, FileUpload separately defines a 100 MB warning threshold, and five translation strings hard-code “100MB+.” The warning runs only above 100 MB, while JSON above 100 MB is rejected and XML above 4 MB is rejected. The UI policy therefore cannot remain consistent by construction.

Concrete failure scenario: today, a 101 MB JSON file is described by the guide as slow and logged by FileUpload as potentially slow, then immediately rejected by parser.ts. A future limit adjustment in parse-utils can pass worker/smoke checks while the warning and all five locales remain stale.

Suggested fix: expose import policy as one typed metadata object alongside the parser constants. Format localized sizes through translation placeholders and derive any pre-parse warning from the accepted limit plus a meaningful below-limit threshold. Add a policy-consistency unit test; do not make tests parse source text to synchronize authored copy.

## Cross-file interaction assessment

- Parser → worker: build-worker.mjs bundles the same parser implementation, and check:worker catches generated drift. The missing-timestamp issue is a contract defect, not parity drift.
- Track → playback/map/export: canonical Track ordering is trusted everywhere, so ARCH7-01 must be corrected at ingestion rather than patched in downstream consumers.
- Track → elevation: optional elevation survives the model and parser, then loses semantics only in ElevationProfile, making that component the correct ownership boundary for ARCH7-02.
- Workspace → floating consumers: attribution and Help require the same bottom-stack boundary, but only attribution consumes an updated hard-coded clearance. ARCH7-03 centralizes that ownership.
- UI → parser policy: FileUpload delegates enforcement correctly but duplicates explanatory policy; ARCH7-04 should be centralized without moving parsing into the component.
- Static export → CSP: next.config.ts, harden-static-export.mjs, smoke-static.mjs, and the workflow remain aligned and fail closed when bootstrap or hashes drift.

## Cycle 6 and ledger review

- ARCH7-01, ARCH7-02, and ARCH7-04 predate Cycle 6. ARCH7-03 crosses the changed timeline layout: Cycle 6 updated the composed stack and attribution clearance but not Help. History also shows the earlier desktop timeline and Help both used bottom-36, so this pass does not claim Cycle 6 was the first introduction; it confirmed that the collision remains after Cycle 6.
- The help/bottom-stack contract was promoted only after bounded geometry proved complete intersection and wrong center hit ownership; prior visual-only checks were not accepted as contrary evidence.
- B01-B04 and D01-D04 are existing authority/evidence/measurement gates. They remain visible in the aggregate and are not new architectural findings.

## Validation and final sweep

ESLint, direct TypeScript checking, generated-worker parity, and 368/368 unit tests passed. The parser probe confirmed the mixed-time reorder, and bounded current-source browser geometry confirmed the complete Help/stack intersection and wrong hit owner. I traced ownership and state flow across ingestion, normalization, map/playback, timeline/scenes, export, responsive layers, localization, static generation, CSP hardening, and deployment. A final search for duplicated state, divergent constants, impossible recovery, circular ownership, and Cycle 6 boundary leakage found no further actionable architectural defect.
