# Documentation Specialist Review — Cycle 2 (2026-07-23)

Reviewed revision: `279f5676eb34baa4929a536fa0c20e9cbc556f34`
Branch: `review-plan-fix/no-deploy-20260723`

## Result

Two fresh current-HEAD documentation regressions were confirmed:

1. **DOC2-01 (Medium/High):** Cycle 1 changed the architecture and all five
   locale dictionaries to promise ordinary follow when no scenes exist, but
   export still silently substitutes the six-scene Cinematic preset.
2. **DOC2-02 (Low/High):** the public README still advertises “Street View”
   after the application and architecture were renamed to the truthful
   “Ground-level Follow.”

These are partial-remediation regressions at the reviewed head, not copies of
the already-fixed Cycle 1 findings.

## Coverage

All 970 tracked paths were inventoried. The current-authority pass read
`README.md`, `.context/README.md`, both project documents, development
conventions, the active plan index and current Cycle 1 completion plan, the
user-injected pending-cycle record, and the reviewer runbook. Historical
reviews/plans were searched for provenance rather than treated as current
behavior.

Documentation claims were compared across production source, all five locale
dictionaries, tests/E2E, scripts, package/configuration, the Pages workflow,
public textual assets, and source comments. The final sweep rechecked setup and
commands, supported inputs and limits, camera/preset names and counts,
playback/export semantics, privacy/network/offline scope, base paths, static
hardening, dependency/runtime versions, test runner behavior, and deployment.

No browser, E2E, server, build, deployment, or source change was performed by
this role. Generated-worker parity and both full/production dependency audits
were checked read-only and passed.

## Findings

### DOC2-01 — Empty-scene export contradicts both the preview and the new five-locale promise

Severity: **Medium**
Confidence: **High**
Status: **Confirmed current behavior/documentation mismatch introduced by the
Cycle 1 remediation**

Exact regions:

- `.context/project/02-architecture.md:98-105`
- `src/lib/i18n.ts:89,462,835,1208,1581`
- `src/components/MapView.tsx:813-835`
- `src/lib/camera.ts:525-538,392-445`
- `src/lib/useExportController.ts:169-176,216-220`

Documentation and UI evidence:

- Architecture line 104 says playback **and export** use ordinary follow for
  the full route when no scenes are defined, and that no scenes are generated
  automatically.
- The English, Korean, Japanese, Chinese, and Spanish empty-state strings all
  tell the user that without scenes the camera follows the route and that
  Cinematic is applied only by choosing that preset.

Implementation evidence:

- Interactive playback does use ordinary follow with an empty scene list:
  `MapView` takes its non-scene follow branch, and
  `computeCameraForProgress()` has the same empty-list fallback.
- Export does the opposite. `useExportController` replaces an empty list with
  `generateDefaultScenes()` and passes that configuration to `exportVideo()`.
  The generator returns Opening Overview, Bird's Eye, Flyover, Orbit Midpoint,
  Ground Follow, and Closing Overview.
- The controller tests construct every harness with `scenes: []`, but do not
  assert the scene list passed to the mocked encoder, which allowed the
  contradiction to remain.
- Before Cycle 1, the empty-state text truthfully said scenes would be
  auto-generated on export. The Cycle 1 documentation/copy commits changed
  that promise without changing the export controller.

Concrete failure scenario:

A traveler imports a route, leaves Camera untouched, previews the ordinary
follow camera, and reads that Cinematic is opt-in. Export silently switches to
six different camera segments. The saved video therefore does not match the
preview or the explicit UI promise, and the traveler has no reason to know
that choosing no preset caused the substitution.

Recommended fix:

Honor the newly documented opt-in contract by passing the empty scene list
through to export, so `computeCameraForProgress()` uses its existing ordinary
follow fallback. Add a controller assertion that an empty list remains empty
and a preview/export parity regression. If automatic cinematic export is
actually the desired product behavior, restore truthful copy in all five
locales and architecture and make the preview disclose/show the effective
export camera; do not retain the current split behavior.

### DOC2-02 — README still advertises the removed “Street View” label

Severity: **Low**
Confidence: **High**
Status: **Confirmed public-document mismatch after a partial rename**

Exact regions:

- `README.md:48,74-83`
- `.context/project/02-architecture.md:89-96`
- `src/lib/i18n.ts:224,230,597,603,970,976,1343,1349,1716,1722`

Evidence:

- README line 48 lists the six modes as including “Street View.”
- The current English UI calls the `ground` mode “Ground-level Follow” and
  explicitly says it has no street imagery. All other locales were changed to
  equally explicit low-angle-follow wording.
- The architecture table likewise distinguishes the internal `Ground` key
  from the “Ground-level Follow” UI label and states “no street imagery.”
- The README camera table already uses “Ground Follow,” so the public document
  contradicts itself as well as the application.

Concrete failure scenario:

A prospective user or contributor reads the feature summary and expects a
Google-like imagery mode, then cannot find “Street View” in the UI. Support
notes or tests copied from the README perpetuate the exact misleading term
that Cycle 1 removed from the product.

Recommended fix:

Replace “Street View” at README line 48 with “Ground-level Follow” and align the
camera-table row with that same UI label. Keep the low-angle/no-imagery
description so the public feature list cannot recreate the old promise.

## Verified accurate scopes and exclusions

- The narrowed offline statement, documented ErrorBoundary class exception,
  and derived export-stub byte count now match source.
- Setup/build/start/test commands, `/travelback` base-path behavior, five
  resolution presets, format support and current 100 MiB JSON / 4 MiB XML
  limits, locale count, privacy/network boundaries, CSP notes, and Pages
  deployment trigger agree with their implementation.
- The architecture's parser, trail, map-layer, export-pipeline, and static-host
  descriptions otherwise agree with their owners.
- The absent root license grant is the unchanged authority-dependent item and
  was not re-reported. The three explicit Cycle 1 deferrals and already-fixed
  Cycle 1 documentation findings were likewise excluded.
