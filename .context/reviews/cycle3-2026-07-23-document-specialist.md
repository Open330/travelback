# Cycle 3 Document Specialist Review — 2026-07-23

Reviewed exact revision `7f013a207e64ca54c0864edc5aaf061ebfb36bdf`.

## Inventory and result

Compared `README.md`, `.context/README.md`, project overview/architecture, development conventions, the current aggregate and Cycle 2 plan/deferrals, `package.json`, Playwright configuration and wrappers, workflow, source-owned limits/defaults, locale copy, and public assets against the implementation.

One new documentation mismatch is confirmed: both command references present the supervised E2E scripts without a platform qualification, while the shipped wrappers cannot run on Windows and intentionally refuse before launching Playwright.

## Finding

### DOC3-01 — The documented E2E commands are unconditionally listed but intentionally unsupported on Windows

- Severity / confidence: **Low / High**
- Status: **Confirmed documentation defect**
- Locations: `README.md:178-185`; `.context/project/01-overview.md:17-29`; package entry points at `package.json:19-23`; wrappers at `scripts/run-dev-e2e.mjs:21-30` and `scripts/run-static-e2e.mjs:19-28`; refusal at `scripts/e2e-process-supervisor.mjs:640-647`.
- Problem: the two authoritative setup sections tell contributors to run `npm run test:e2e` and `npm run test:e2e:static` without an OS caveat. Both wrappers call `runSupervisedProcess()` without a `launchContainedProcess` provider. On `win32`, that function deliberately returns `UnsupportedProcessContainmentError` before Playwright starts because this repository ships no atomic Job Object provider.
- Failure scenario: a Windows contributor follows the documented verification flow, installs Chromium, and receives an unexplained hard failure for both E2E commands even though the documentation presents them as ordinary supported commands.
- Root documentation fix: state that supervised E2E currently requires POSIX process inspection, explain that Windows is refused for cleanup safety until a Job Object provider exists, and distinguish the cross-platform unit/process commands from the unsupported browser commands. Do not recommend the unsupervised `test:e2e:dev` escape hatch as a cleanup-safe equivalent.

## Terminology decision

`.context/project/01-overview.md:87` uses “Ground Follow,” while the public UI/README label is “Ground-level Follow.” This is not counted as an actionable defect: `src/lib/camera.ts` also uses “Ground Follow” as the internal preset name, the phrase accurately describes the mode, and the Cycle 2 terminology fix removed the materially misleading “Street View” claim. Normalizing the shorthand would be optional editorial polish.

## Consistency sweep

- Runtime/framework versions, import families and limits, local-only privacy boundary, bundled map behavior, camera/export defaults, static base path, CSP delivery, and source-tree descriptions match current implementation.
- README camera labels no longer promise street imagery, and the architecture explicitly distinguishes internal keys from UI labels.
- Build/start/deploy statements and package script names remain aligned with configuration.
- The three P01 portable-containment limitations remain explicit deferrals and were not converted into documentation demands for an unsafe workaround.
- No browser, deployment, source edit, plan edit, or aggregate edit was performed for this review.
