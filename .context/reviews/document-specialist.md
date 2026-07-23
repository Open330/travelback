# Documentation Specialist Review — Cycle 1 (2026-07-23)

Reviewed revision: `994820a71b0b87de78fdfd2a1fd2c17e7ad3b516`

## Result

Three current documentation mismatches were confirmed:

1. DOC1-01 (Medium/High) reopens an earlier “likely verified” offline assumption with a concrete uncached-runtime-asset failure path.
2. DOC1-02 (Low/High) states that class components are forbidden although the required error-boundary implementation is intentionally a class.
3. DOC1-03 (Low/High) repeatedly calls the E2E export stub 26 bytes although the emitted payload is exactly 22 bytes.

## Coverage

Compared `README.md`, `.context/README.md`, the project overview and architecture, development conventions, the active plan index, Mina's reviewer runbook, current aggregate/user instructions, package/configuration, every script, the Pages workflow, production comments, public textual assets, and traveler-visible strings across all five locale dictionaries against current source and tests. All 961 tracked paths were inventoried; historical context and legacy plans were searched for provenance rather than treated as current authority. Binary font/icon bodies and historical screenshots were excluded from prose inspection.

Lint, typecheck, 472 unit/component tests, and generated-worker parity passed. No browser, Playwright, server, build, deployment, or external publication was started by this role.

## Findings

### DOC1-01 — “Works offline after initial page load” overstates same-origin bundling as offline availability

Severity: **Medium**
Confidence: **High**
Status: **Confirmed current mismatch; incomplete prior verification**

Documentation evidence:

- `.context/project/02-architecture.md:119-128` describes the client-side-only design and promises “Works offline after initial page load, including Journey Creator coordinate jumps.”

Implementation evidence:

- `next.config.ts:9-18` creates a static export, but neither the tracked source nor `package.json:24-53` defines a service worker, offline manifest, Workbox integration, or another precache owner.
- `src/types.ts:25-45` exposes five map-style JSON URLs, and `src/components/MapView.tsx:1038-1039` fetches a selected style later through `map.setStyle(...)`.
- `src/lib/parser.ts:244,379-387` caps main-thread JSON fallback at 16 MB and creates the Google parser worker only when a JSON import begins. For larger files, `src/lib/parser.ts:461-469` rejects when that uncached worker cannot load.
- `src/app/page.tsx:419-431` fetches `sample-trip.gpx` only when the user chooses the sample.
- `.context/reviews/verifier-2026-05-04.md:76-78` previously marked the promise “LIKELY VERIFIED” because assets were bundled and styles appeared local. That check established absence of third-party dependencies, not offline precaching of assets first requested after disconnection.

Concrete failure scenario:

A user opens the landing page online, then loses connectivity before using JSON import, changing to a previously unused style, or choosing the sample. A Google JSON file above 16 MB cannot use the bounded main-thread fallback when the worker asset fails to load; the import is rejected. An uncached style or sample request likewise fails. Every URL is privacy-preserving and same-origin, but “bundled” does not mean “already cached after the initial page load.”

Suggested fix:

Unless offline-first support is intentionally added, narrow the statement to the property the implementation guarantees: processing is client-side and runtime assets have no third-party dependency, while features whose same-origin assets have not yet loaded still require network/cache availability. If full offline operation is desired, add an explicit service-worker/precache design for the worker, all style JSON, sample/font/chunks, with update semantics and an offline integration test.

### DOC1-02 — “No class components” contradicts the intentional error-boundary class

Severity: **Low**
Confidence: **High**
Status: **Confirmed**

Documentation evidence:

- `.context/development/01-conventions.md:11-15` says “React 19 with hooks (no class components).”

Implementation evidence:

- `src/components/ErrorBoundary.tsx:13-100` defines `ErrorBoundaryInner extends React.Component`, using `getDerivedStateFromError` and `componentDidCatch`.
- `src/components/ErrorBoundary.tsx:102-109` intentionally wraps that class with a function component so locale can still come from the hook-based context.
- Historical architecture reviews already recognize this split as intentional because render error boundaries still require the class lifecycle in the current implementation.

Concrete failure scenario:

A contributor follows the convention mechanically and converts `ErrorBoundaryInner` into a hook-only function. The result can no longer catch descendant render errors through `getDerivedStateFromError`/`componentDidCatch`, silently removing the app-level recovery UI.

Suggested fix:

Change the convention to “Prefer function components and hooks; the inner React error boundary is the documented class-component exception.”

### DOC1-03 — The developer export stub is 22 bytes, not 26

Severity: **Low**
Confidence: **High**
Status: **Confirmed**

Documentation evidence:

- `src/lib/test-stub.ts:4-6` describes a 26-byte stub.
- `src/lib/test-stub.ts:16-18` logs that exports will produce 26-byte files.
- `e2e/travelback.spec.ts:2956` repeats the same size in the real-export test comment.

Implementation evidence:

- `src/lib/useExportController.ts:203-213` emits `new TextEncoder().encode('travelback-test-export').buffer`.
- The ASCII literal `travelback-test-export` contains 22 bytes; a direct `TextEncoder().encode(...).byteLength` check returns 22.

Concrete failure scenario:

A maintainer uses the warning/comment to distinguish a stub export from a corrupt artifact or adds a size assertion based on the documented value. The valid stub is 22 bytes, so the diagnostic or test reports the intended output as wrong.

Suggested fix:

Avoid a duplicated numeric claim. Export one test-stub payload/byte constant, derive its `byteLength` for the warning when needed, and describe the E2E comment as a “small stub payload” unless exact size is behavior under test.

## Verified accurate scopes and carryovers

README setup/build/base-path commands, supported formats and limits, local-only map/privacy wording, map/theme and camera labels, preset counts, export presets/codecs/limits, locale count, and current runner names agree with source. The architecture's parser, track, camera, map-layer, and export-pipeline descriptions otherwise match their owners.

Existing B03 remains unchanged: `README.md:225-227` claims MIT while the repository has no root license grant, and exact legal intent still requires owner input. B01/B02 remain workflow-authorization items rather than fresh documentation defects. No additional current documentation mismatch survived the final sweep.
